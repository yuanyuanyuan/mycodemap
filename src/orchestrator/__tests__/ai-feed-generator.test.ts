/**
 * AI 饲料生成器单元测试
 *
 * 测试覆盖要求:
 * - 文件头注释解析测试
 * - 三维评分计算测试
 * - 依赖分析测试
 * - 输出格式测试
 * - 集成测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AIFeedGenerator,
  FileHeaderScanner,
  AIFeed,
  FileMeta
} from '../ai-feed-generator';
import { GitAnalyzer, HeatScore } from '../git-analyzer';
import * as fs from 'fs';
import * as path from 'path';
import { globby } from 'globby';

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn()
  };
});

// Mock globby
vi.mock('globby', () => ({
  globby: vi.fn()
}));

describe('FileHeaderScanner', () => {
  let scanner: FileHeaderScanner;

  beforeEach(() => {
    scanner = new FileHeaderScanner();
    vi.clearAllMocks();
  });

  describe('parseHeader', () => {
    it('should parse [META] with since, owner, stable fields', () => {
      const header = `// [META] since:2024-01 owner:backend-team stable:true
// Some other comment
import { x } from './module';`;

      const result = scanner.parseHeader(header);

      expect(result.since).toBe('2024-01');
      expect(result.owner).toBe('backend-team');
      expect(result.stable).toBe(true);
    });

    it('should parse [META] with only since field', () => {
      const header = `// [META] since:2023-06
// Other content`;

      const result = scanner.parseHeader(header);

      expect(result.since).toBe('2023-06');
      expect(result.owner).toBeUndefined();
      // stable is set to false (not undefined) because includes('stable:true') returns false
      expect(result.stable).toBe(false);
    });

    it('should parse [WHY] comment', () => {
      const header = `// [WHY] 处理JWT验证，因第三方Token刷新策略变更频繁不稳定
// Other comment`;

      const result = scanner.parseHeader(header);

      expect(result.why).toBe('处理JWT验证，因第三方Token刷新策略变更频繁不稳定');
    });

    it('should parse [DEPS] comma-separated dependencies', () => {
      const header = `// [DEPS] src/db/connection.ts, src/types/auth.d.ts
// Other content`;

      const result = scanner.parseHeader(header);

      expect(result.deps).toEqual(['src/db/connection.ts', 'src/types/auth.d.ts']);
    });

    it('should parse [DEPS] with single dependency', () => {
      const header = `// [DEPS] src/utils/logger.ts`;

      const result = scanner.parseHeader(header);

      expect(result.deps).toEqual(['src/utils/logger.ts']);
    });

    it('should parse all header comments together', () => {
      const header = `// [META] since:2024-01 owner:backend-team stable:true
// [WHY] 核心业务逻辑处理器
// [DEPS] src/types/index.ts, src/utils/helper.ts
// Regular comment
export const test = 1;`;

      const result = scanner.parseHeader(header);

      expect(result.since).toBe('2024-01');
      expect(result.owner).toBe('backend-team');
      expect(result.stable).toBe(true);
      expect(result.why).toBe('核心业务逻辑处理器');
      expect(result.deps).toEqual(['src/types/index.ts', 'src/utils/helper.ts']);
    });

    it('should handle empty header', () => {
      const result = scanner.parseHeader('');

      expect(result.since).toBeUndefined();
      expect(result.why).toBeUndefined();
      expect(result.deps).toBeUndefined();
    });

    it('should handle header without special comments', () => {
      const header = `// Regular comment
// Another regular comment
import { x } from './module';`;

      const result = scanner.parseHeader(header);

      expect(result.since).toBeUndefined();
      expect(result.why).toBeUndefined();
      expect(result.deps).toBeUndefined();
    });
  });

  describe('scan', () => {
    it('should read file and parse header', () => {
      const fileContent = `// [META] since:2024-01 owner:backend-team stable:true
// [WHY] Test file
import { x } from './module';
export const test = 1;`;

      vi.mocked(fs.readFileSync).mockReturnValue(fileContent);

      const result = scanner.scan('src/test-file.ts');

      expect(fs.readFileSync).toHaveBeenCalledWith('src/test-file.ts', 'utf-8');
      expect(result.since).toBe('2024-01');
      expect(result.why).toBe('Test file');
    });

    it('should handle files without header comments', () => {
      const fileContent = `import { x } from './module';
export const test = 1;`;

      vi.mocked(fs.readFileSync).mockReturnValue(fileContent);

      const result = scanner.scan('src/no-header.ts');

      expect(result.since).toBeUndefined();
      expect(result.why).toBeUndefined();
    });

    it('should only scan first 10 lines', () => {
      // META comment is on line 12 (index 11)
      const lines = Array(11).fill('// filler line');
      lines.push('// [META] since:2024-01');
      const fileContent = lines.join('\n');

      vi.mocked(fs.readFileSync).mockReturnValue(fileContent);

      const result = scanner.scan('src/long-file.ts');

      expect(result.since).toBeUndefined();
    });

    it('should handle file read errors gracefully', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = scanner.scan('src/non-existent.ts');

      expect(result).toEqual({});
    });
  });

  describe('validate', () => {
    it('should return valid when all required fields present', () => {
      const fileContent = `// [META] since:2024-01
// [WHY] Test file
export const test = 1;`;

      vi.mocked(fs.readFileSync).mockReturnValue(fileContent);

      const result = scanner.validate('src/valid-file.ts');

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should detect missing since', () => {
      const fileContent = `// [META] owner:backend-team
// [WHY] Test file`;

      vi.mocked(fs.readFileSync).mockReturnValue(fileContent);

      const result = scanner.validate('src/missing-since.ts');

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('[META] since');
    });

    it('should detect missing WHY', () => {
      const fileContent = `// [META] since:2024-01`;

      vi.mocked(fs.readFileSync).mockReturnValue(fileContent);

      const result = scanner.validate('src/missing-why.ts');

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('[WHY]');
    });

    it('should detect both missing fields', () => {
      const fileContent = `// Regular comment`;

      vi.mocked(fs.readFileSync).mockReturnValue(fileContent);

      const result = scanner.validate('src/empty-header.ts');

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('[META] since');
      expect(result.missing).toContain('[WHY]');
    });
  });
});

describe('AIFeedGenerator', () => {
  let generator: AIFeedGenerator;
  let gitAnalyzer: GitAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a mock GitAnalyzer with all required methods
    gitAnalyzer = {
      analyzeFileHeat: vi.fn().mockResolvedValue({
        freq30d: 5,
        lastType: 'BUGFIX',
        lastDate: new Date('2026-02-19'),
        stability: false
      }),
      calculateRiskLevel: vi.fn().mockReturnValue('medium')
    } as unknown as GitAnalyzer;

    generator = new AIFeedGenerator(gitAnalyzer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generate', () => {
    it('should generate feed for all TypeScript files', async () => {
      const mockFiles = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
      vi.mocked(globby).mockResolvedValue(mockFiles);
      vi.mocked(fs.readFileSync).mockReturnValue('export const x = 1;');
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const feed = await generator.generate('/project');

      expect(feed).toHaveLength(3);
      expect(feed.map(f => f.file)).toEqual(expect.arrayContaining(mockFiles));
    });

    it('should call GitAnalyzer.analyzeFileHeat for each file', async () => {
      const mockFiles = ['src/a.ts', 'src/b.ts'];
      vi.mocked(globby).mockResolvedValue(mockFiles);
      vi.mocked(fs.readFileSync).mockReturnValue('export const x = 1;');
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await generator.generate('/project', { includeGitHistory: true });

      expect(gitAnalyzer.analyzeFileHeat).toHaveBeenCalledTimes(2);
    });

    it('should not call GitAnalyzer by default (includeGitHistory defaults to false)', async () => {
      const mockFiles = ['src/a.ts', 'src/b.ts'];
      vi.mocked(globby).mockResolvedValue(mockFiles);
      vi.mocked(fs.readFileSync).mockReturnValue('export const x = 1;');
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Call without includeGitHistory option (should default to false)
      await generator.generate('/project');

      // GitAnalyzer should NOT be called
      expect(gitAnalyzer.analyzeFileHeat).not.toHaveBeenCalled();

      // Heat score should be empty/default
      const feed = await generator.generate('/project');
      expect(feed[0].heat.freq30d).toBe(0);
      expect(feed[0].heat.lastType).toBe('unknown');
    });

    it('should handle empty file list', async () => {
      vi.mocked(globby).mockResolvedValue([]);

      const feed = await generator.generate('/project');

      expect(feed).toEqual([]);
    });

    it('should handle file read errors gracefully', async () => {
      const mockFiles = ['src/a.ts', 'src/b.ts'];
      vi.mocked(globby).mockResolvedValue(mockFiles);

      vi.mocked(fs.readFileSync).mockImplementation((filepath) => {
        if (typeof filepath === 'string' && filepath.includes('b.ts')) {
          throw new Error('Permission denied');
        }
        return 'export const x = 1;';
      });
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const feed = await generator.generate('/project');

      // b.ts should still be included, just without dependency info
      expect(feed).toHaveLength(2);
      const bFeed = feed.find(f => f.file === 'src/b.ts');
      expect(bFeed).toBeDefined();
    });

    it('should skip non-existent files', async () => {
      const mockFiles = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
      vi.mocked(globby).mockResolvedValue(mockFiles);
      vi.mocked(fs.existsSync).mockImplementation((filepath) => {
        // src/b.ts does not exist
        if (typeof filepath === 'string' && filepath.includes('b.ts')) {
          return false;
        }
        return true;
      });
      vi.mocked(fs.readFileSync).mockReturnValue('export const x = 1;');

      const feed = await generator.generate('/project');

      // Only a.ts and c.ts should be included
      expect(feed).toHaveLength(2);
      expect(feed.map(f => f.file)).not.toContain('src/b.ts');
    });
  });

  describe('writeFeedFile', () => {
    it('should generate correct header format', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));

      const feed: AIFeed[] = [];

      generator.writeFeedFile(feed, '.codemap/ai-feed.txt');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;

      expect(content).toMatch(/^# CODEMAP AI FEED\n/);
      expect(content).toMatch(/# Generated: 2026-03-01T12:00:00\.000Z/);

      vi.useRealTimers();
    });

    it('should format each file entry correctly', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));

      const feed: AIFeed[] = [{
        file: 'src/test.ts',
        gravity: 15,
        heat: { freq30d: 5, lastType: 'BUGFIX', lastDate: new Date('2026-02-19'), stability: false },
        meta: { since: '2024-01', owner: 'team', stable: false },
        deps: ['src/a.ts', 'src/b.ts'],
        dependents: ['src/x.ts', 'src/y.ts']
      }];

      generator.writeFeedFile(feed, '.codemap/ai-feed.txt');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;

      expect(content).toMatch(/FILE: src\/test\.ts/);
      expect(content).toMatch(/GRAVITY: 15/);
      expect(content).toMatch(/HEAT: 5\/BUGFIX/);
      expect(content).toMatch(/META: since=2024-01/);
      expect(content).toMatch(/stable=false/);
      expect(content).toMatch(/IMPACT: 2 files depend on this/);
      expect(content).toMatch(/DEPS: src\/a\.ts, src\/b\.ts/);

      vi.useRealTimers();
    });

    it('should handle files with null metadata', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));

      const feed: AIFeed[] = [{
        file: 'src/unknown.ts',
        gravity: 0,
        heat: { freq30d: 0, lastType: 'NEW', lastDate: null, stability: true },
        meta: { since: undefined, owner: undefined, stable: undefined },
        deps: [],
        dependents: []
      }];

      generator.writeFeedFile(feed, '.codemap/ai-feed.txt');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;

      expect(content).toMatch(/FILE: src\/unknown\.ts/);
      expect(content).toMatch(/DEPS: none/);

      vi.useRealTimers();
    });

    it('should separate entries with ---', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));

      const feed: AIFeed[] = [
        { file: 'src/a.ts', gravity: 1, heat: { freq30d: 0, lastType: 'NEW', lastDate: null, stability: true }, meta: {}, deps: [], dependents: [] },
        { file: 'src/b.ts', gravity: 2, heat: { freq30d: 0, lastType: 'NEW', lastDate: null, stability: true }, meta: {}, deps: [], dependents: [] }
      ];

      generator.writeFeedFile(feed, '.codemap/ai-feed.txt');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;

      // Count --- separators (one per entry)
      const separators = content.match(/---/g);
      expect(separators).toHaveLength(2);

      vi.useRealTimers();
    });

    it('should create output directory if not exists', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));

      vi.mocked(fs.existsSync).mockReturnValue(false);

      const feed: AIFeed[] = [];
      generator.writeFeedFile(feed, '.codemap/ai-feed.txt');

      expect(fs.mkdirSync).toHaveBeenCalledWith('.codemap', { recursive: true });

      vi.useRealTimers();
    });

    it('should not create directory if already exists', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));

      vi.mocked(fs.existsSync).mockReturnValue(true);

      const feed: AIFeed[] = [];
      generator.writeFeedFile(feed, '.codemap/ai-feed.txt');

      expect(fs.mkdirSync).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('calculateRisk', () => {
    it('should call GitAnalyzer.calculateRiskLevel', () => {
      const feed: AIFeed = {
        file: 'src/test.ts',
        gravity: 10,
        heat: { freq30d: 5, lastType: 'BUGFIX', lastDate: new Date(), stability: false },
        meta: { since: '2024-01', stable: false },
        deps: ['a.ts'],
        dependents: ['b.ts']
      };

      const risk = generator.calculateRisk(feed);

      expect(gitAnalyzer.calculateRiskLevel).toHaveBeenCalledWith(
        10,
        feed.heat,
        1, // dependents.length
        false // stable
      );
      expect(risk).toBe('medium');
    });

    it('should use default stable value when not specified', () => {
      const feed: AIFeed = {
        file: 'src/test.ts',
        gravity: 5,
        heat: { freq30d: 2, lastType: 'FEATURE', lastDate: new Date(), stability: true },
        meta: { since: '2024-01' }, // stable is undefined
        deps: [],
        dependents: []
      };

      generator.calculateRisk(feed);

      expect(gitAnalyzer.calculateRiskLevel).toHaveBeenCalledWith(
        5,
        feed.heat,
        0,
        true // default stable = true when undefined
      );
    });
  });

  describe('calculateRisks', () => {
    it('should calculate risk for multiple files', () => {
      const feeds: AIFeed[] = [
        { file: 'src/a.ts', gravity: 10, heat: { freq30d: 5, lastType: 'BUGFIX', lastDate: new Date(), stability: false }, meta: {}, deps: [], dependents: [] },
        { file: 'src/b.ts', gravity: 5, heat: { freq30d: 2, lastType: 'FEATURE', lastDate: new Date(), stability: true }, meta: {}, deps: [], dependents: [] }
      ];

      const risks = generator.calculateRisks(feeds);

      expect(risks.size).toBe(2);
      expect(risks.get('src/a.ts')).toBe('medium');
      expect(risks.get('src/b.ts')).toBe('medium');
    });
  });

  describe('getHighRiskFiles', () => {
    it('should return only high risk files', () => {
      // Override mock to return 'high' for specific cases
      vi.mocked(gitAnalyzer.calculateRiskLevel).mockImplementation((gravity) => {
        return gravity > 5 ? 'high' : 'low';
      });

      const feeds: AIFeed[] = [
        { file: 'src/high-risk.ts', gravity: 10, heat: { freq30d: 5, lastType: 'BUGFIX', lastDate: new Date(), stability: false }, meta: {}, deps: [], dependents: [] },
        { file: 'src/low-risk.ts', gravity: 2, heat: { freq30d: 1, lastType: 'DOCS', lastDate: new Date(), stability: true }, meta: {}, deps: [], dependents: [] }
      ];

      const highRisk = generator.getHighRiskFiles(feeds);

      expect(highRisk).toHaveLength(1);
      expect(highRisk[0].file).toBe('src/high-risk.ts');
    });

    it('should return empty array when no high risk files', () => {
      vi.mocked(gitAnalyzer.calculateRiskLevel).mockReturnValue('low');

      const feeds: AIFeed[] = [
        { file: 'src/a.ts', gravity: 2, heat: { freq30d: 1, lastType: 'DOCS', lastDate: new Date(), stability: true }, meta: {}, deps: [], dependents: [] }
      ];

      const highRisk = generator.getHighRiskFiles(feeds);

      expect(highRisk).toEqual([]);
    });
  });

  describe('scanFileHeader', () => {
    it('should delegate to FileHeaderScanner.scan', () => {
      const fileContent = `// [META] since:2024-01 owner:test-team stable:true
// [WHY] Test file description`;

      vi.mocked(fs.readFileSync).mockReturnValue(fileContent);

      const result = generator.scanFileHeader('src/test.ts');

      expect(result.since).toBe('2024-01');
      expect(result.owner).toBe('test-team');
      expect(result.stable).toBe(true);
      expect(result.why).toBe('Test file description');
    });
  });

  describe('calculateScores', () => {
    it('should calculate scores with default max values', () => {
      const feed: AIFeed = {
        file: 'src/test.ts',
        gravity: 0,
        heat: { freq30d: 10, lastType: 'BUGFIX', lastDate: new Date(), stability: false },
        meta: {},
        deps: new Array(10).fill('dep.ts'), // 10 deps
        dependents: new Array(5).fill('dep.ts') // 5 dependents
      };

      // Default maxGravity=20, maxImpact=50
      const scores = generator.calculateScores(feed);

      // gravity = 15, normalized: 15/20 = 0.75
      expect(scores.gravity).toBe(0.75);
      // impact = 5, normalized: 5/50 = 0.1
      expect(scores.impact).toBe(0.1);
      // heat = 10, normalized: 10/10 = 1
      expect(scores.heat).toBe(1);
    });

    it('should calculate scores with custom max values', () => {
      const feed: AIFeed = {
        file: 'src/test.ts',
        gravity: 0,
        heat: { freq30d: 5, lastType: 'BUGFIX', lastDate: new Date(), stability: false },
        meta: {},
        deps: ['a.ts', 'b.ts', 'c.ts'],
        dependents: ['x.ts']
      };

      const scores = generator.calculateScores(feed, 10, 5);

      // gravity = 4, normalized: 4/10 = 0.4
      expect(scores.gravity).toBe(0.4);
      // impact = 1, normalized: 1/5 = 0.2
      expect(scores.impact).toBe(0.2);
      // heat = 5, normalized: 5/10 = 0.5
      expect(scores.heat).toBe(0.5);
    });

    it('should cap scores at 1', () => {
      const feed: AIFeed = {
        file: 'src/test.ts',
        gravity: 0,
        heat: { freq30d: 100, lastType: 'BUGFIX', lastDate: new Date(), stability: false },
        meta: {},
        deps: new Array(100).fill('dep.ts'),
        dependents: new Array(100).fill('dep.ts')
      };

      const scores = generator.calculateScores(feed, 10, 5);

      expect(scores.gravity).toBe(1);
      expect(scores.impact).toBe(1);
      expect(scores.heat).toBe(1);
    });
  });

  describe('writeFeedFileJson', () => {
    it('should write JSON format correctly', () => {
      const feed: AIFeed[] = [{
        file: 'src/test.ts',
        gravity: 15,
        heat: { freq30d: 5, lastType: 'BUGFIX', lastDate: new Date('2026-02-19'), stability: false },
        meta: { since: '2024-01', owner: 'team', stable: false },
        deps: ['src/a.ts'],
        dependents: ['src/b.ts']
      }];

      generator.writeFeedFileJson(feed, '.codemap/ai-feed.json');

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;
      const parsed = JSON.parse(content);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].file).toBe('src/test.ts');
      expect(parsed[0].gravity).toBe(15);
    });

    it('should handle Date objects in heat', () => {
      const feed: AIFeed[] = [{
        file: 'src/test.ts',
        gravity: 0,
        heat: { freq30d: 0, lastType: 'NEW', lastDate: new Date('2026-01-15'), stability: true },
        meta: {},
        deps: [],
        dependents: []
      }];

      generator.writeFeedFileJson(feed, '.codemap/ai-feed.json');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;
      const parsed = JSON.parse(content);

      expect(parsed[0].heat.lastDate).toBe('2026-01-15T00:00:00.000Z');
    });

    it('should handle null lastDate', () => {
      const feed: AIFeed[] = [{
        file: 'src/test.ts',
        gravity: 0,
        heat: { freq30d: 0, lastType: 'NEW', lastDate: null, stability: true },
        meta: {},
        deps: [],
        dependents: []
      }];

      generator.writeFeedFileJson(feed, '.codemap/ai-feed.json');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;
      const parsed = JSON.parse(content);

      expect(parsed[0].heat.lastDate).toBeNull();
    });

    it('should create output directory if not exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      generator.writeFeedFileJson([], '.codemap/ai-feed.json');

      expect(fs.mkdirSync).toHaveBeenCalledWith('.codemap', { recursive: true });
    });
  });
});

describe('Integration tests', () => {
  let generator: AIFeedGenerator;
  let gitAnalyzer: GitAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    gitAnalyzer = {
      analyzeFileHeat: vi.fn().mockResolvedValue({
        freq30d: 5,
        lastType: 'BUGFIX',
        lastDate: new Date('2026-02-19'),
        stability: false
      }),
      calculateRiskLevel: vi.fn().mockReturnValue('medium')
    } as unknown as GitAnalyzer;

    generator = new AIFeedGenerator(gitAnalyzer);
  });

  it('should complete full workflow: generate -> write', async () => {
    // Set up test data
    const mockFiles = ['src/core.ts', 'src/utils.ts'];
    vi.mocked(globby).mockResolvedValue(mockFiles);

    // Set up file contents
    vi.mocked(fs.readFileSync).mockImplementation((filepath) => {
      if (typeof filepath !== 'string') return '';

      if (filepath.includes('core.ts')) {
        return `// [META] since:2024-01 stable:false owner:core-team
// [WHY] Core logic module
import { helper } from './utils';`;
      } else if (filepath.includes('utils.ts')) {
        return `// [META] since:2023-06 stable:true
// [WHY] Utility functions
export const helper = 1;`;
      }
      return '';
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    // 1. Generate feed
    const feed = await generator.generate('/project');

    // 2. Verify feed structure
    expect(feed).toHaveLength(2);

    const coreFeed = feed.find(f => f.file === 'src/core.ts');
    expect(coreFeed?.meta.since).toBe('2024-01');
    expect(coreFeed?.meta.owner).toBe('core-team');
    expect(coreFeed?.meta.why).toBe('Core logic module');

    // 3. Write file
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
    generator.writeFeedFile(feed, '.codemap/ai-feed.txt');

    // 4. Verify write
    expect(fs.writeFileSync).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('should correctly identify dependency relationships', async () => {
    const mockFiles = ['src/a.ts', 'src/b.ts', 'src/c.ts'];
    vi.mocked(globby).mockResolvedValue(mockFiles);

    // Create dependency: a -> b -> c
    vi.mocked(fs.readFileSync).mockImplementation((filepath) => {
      if (typeof filepath !== 'string') return '';

      if (filepath.includes('a.ts')) {
        return `import { b } from './b';`;
      } else if (filepath.includes('b.ts')) {
        return `import { c } from './c';`;
      }
      return `export const x = 1;`;
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const feed = await generator.generate('/project');

    // c is depended on by b
    const cFeed = feed.find(f => f.file === 'src/c.ts');
    expect(cFeed!.dependents).toContain('src/b.ts');

    // b is depended on by a
    const bFeed = feed.find(f => f.file === 'src/b.ts');
    expect(bFeed!.dependents).toContain('src/a.ts');
  });

  it('should handle real-world file structure', async () => {
    const mockFiles = [
      'src/orchestrator/ai-feed-generator.ts',
      'src/orchestrator/git-analyzer.ts',
      'src/types/index.ts'
    ];
    vi.mocked(globby).mockResolvedValue(mockFiles);

    vi.mocked(fs.readFileSync).mockImplementation((filepath) => {
      if (typeof filepath !== 'string') return '';

      if (filepath.includes('ai-feed-generator.ts')) {
        return `import { GitAnalyzer } from './git-analyzer';
import { HeatScore } from '../types';`;
      } else if (filepath.includes('git-analyzer.ts')) {
        return `import { HeatScore } from '../types';`;
      }
      return `export interface HeatScore { freq30d: number; }`;
    });
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const feed = await generator.generate('/project');

    expect(feed).toHaveLength(3);

    // Check that deps were extracted
    const generatorFeed = feed.find(f => f.file === 'src/orchestrator/ai-feed-generator.ts');
    expect(generatorFeed!.deps.length).toBeGreaterThan(0);
  });
});
