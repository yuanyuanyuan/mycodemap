// [META] since:2026-03-02 | owner:orchestrator-team | stable:true
// [WHY] AI feed generator with date format alignment for JSON serialization

/**
 * AI Feed Generator
 * Generates structured data for AI consumption (ai-feed.txt)
 * Provides code metadata, dependency complexity, modification heat, etc.
 */

import * as fs from 'fs';
import * as path from 'path';
import { globby } from 'globby';
import { GitAnalyzer, HeatScore } from './git-analyzer';

/**
 * File metadata interface (flat structure for compatibility)
 */
export interface FileMeta {
  /** Creation date, format: 2024-01 */
  since?: string;
  /** Owner/team */
  owner?: string;
  /** Whether stable */
  stable?: boolean;
  /** Reason for existence */
  why?: string;
  /** Key dependencies */
  deps?: string[];
}

/**
 * File header metadata interface (nested structure)
 * @deprecated Use FileMeta instead
 */
export interface FileHeaderMeta {
  /** Creation date, format: 2024-01 */
  since?: string;
  /** Owner/team */
  owner?: string;
  /** Whether stable */
  stable?: boolean;
}

/**
 * File header parsing result interface
 */
export interface FileHeader {
  /** META metadata */
  meta?: FileHeaderMeta;
  /** Reason for existence */
  why?: string;
  /** Key dependencies */
  deps?: string[];
}

/**
 * AI Feed entry interface
 */
export interface AIFeed {
  /** File path */
  file: string;
  /** Dependency complexity (out-degree + in-degree) */
  gravity: number;
  /** Heat score */
  heat: HeatScore;
  /** Metadata */
  meta: FileHeaderMeta & { why?: string };
  /** Dependencies */
  deps: string[];
  /** Files that depend on this */
  dependents: string[];
}

/**
 * File header comment scanner
 * Scans [META]/[WHY]/[DEPS] comments at the top of files
 */
export class FileHeaderScanner {
  /**
   * Scan file header comments
   * Only reads first 10 lines of the file
   *
   * @param filePath - Full file path
   * @returns FileMeta parsing result
   */
  scan(filePath: string): FileMeta {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').slice(0, 10);
      const header = lines.join('\n');

      return this.parseHeader(header);
    } catch {
      // Return empty object on read failure
      return {};
    }
  }

  /**
   * Parse file header content string (public for testing)
   * Alias for parseHeaderContent for backward compatibility
   * 
   * @param header - File header content (first 10 lines as string)
   * @returns FileMeta parsing result with flat structure
   */
  parseHeader(header: string): FileMeta {
    return this.parseHeaderContent(header);
  }

  /**
   * Parse file header content (public for testing)
   * Returns nested structure for backward compatibility with tests
   *
   * @param header - File header content (first 10 lines)
   * @returns FileHeader parsing result with nested meta
   */
  parseHeaderContent(header: string): FileHeader & FileMeta {
    const result: FileHeader & FileMeta = {};

    // Parse [META]
    const metaMatch = header.match(/\/\/\s*\[META\]\s*(.+)/);
    if (metaMatch) {
      const metaStr = metaMatch[1];
      result.meta = {
        since: metaStr.match(/since:(\S+)/)?.[1],
        owner: metaStr.match(/owner:(\S+)/)?.[1],
        stable: metaStr.includes('stable:true')
      };
      // Also set flat properties for compatibility
      result.since = result.meta.since;
      result.owner = result.meta.owner;
      result.stable = result.meta.stable;
    }

    // Parse [WHY]
    const whyMatch = header.match(/\/\/\s*\[WHY\]\s*(.+)/);
    if (whyMatch) {
      result.why = whyMatch[1].trim();
    }

    // Parse [DEPS]
    const depsMatch = header.match(/\/\/\s*\[DEPS\]\s*(.+)/);
    if (depsMatch) {
      result.deps = depsMatch[1]
        .split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0);
    }

    return result;
  }

  /**
   * Validate file header completeness
   * Used by CI gateway
   *
   * @param filePath - File path
   * @returns Validation result
   */
  validate(filePath: string): { valid: boolean; missing: string[] } {
    const meta = this.scan(filePath);
    const missing: string[] = [];

    if (!meta.since) {
      missing.push('[META] since');
    }
    if (!meta.why) {
      missing.push('[WHY]');
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }
}

/**
 * AI Feed Generator class
 * Generates structured data for AI consumption
 */
export class AIFeedGenerator {
  private gitAnalyzer: GitAnalyzer;
  private headerScanner: FileHeaderScanner;

  /**
   * Constructor
   *
   * @param gitAnalyzer - GitAnalyzer instance
   */
  constructor(gitAnalyzer: GitAnalyzer) {
    this.gitAnalyzer = gitAnalyzer;
    this.headerScanner = new FileHeaderScanner();
  }

  /**
   * Generate AI feed
   * Integrated into codemap generate command
   *
   * @param projectRoot - Project root directory
   * @param options - Generation options
   * @param options.includeGitHistory - Whether to include Git history analysis (default: false)
   * @returns AIFeed[] feed list (sorted by gravity descending)
   */
  async generate(projectRoot: string, options?: { includeGitHistory?: boolean }): Promise<AIFeed[]> {
    const includeGitHistory = options?.includeGitHistory ?? false;
    // 1. Get all TypeScript files
    const files = await globby(['src/**/*.ts'], {
      cwd: projectRoot,
      ignore: ['**/*.d.ts', '**/node_modules/**', '**/dist/**']
    });

    const feed: AIFeed[] = [];

    // 2. First pass: collect basic info
    for (const file of files) {
      const fullPath = path.join(projectRoot, file);

      // Skip non-existent files (globby may return deleted files)
      if (!fs.existsSync(fullPath)) {
        continue;
      }

      const header = this.headerScanner.scan(fullPath);
      // Only scan Git history if explicitly enabled
      const heat = includeGitHistory
        ? await this.scanGitHistory(file, projectRoot)
        : { freq30d: 0, lastType: 'unknown', lastDate: null, stability: true };

      feed.push({
        file,
        gravity: 0, // Will be calculated in second pass
        heat,
        meta: {
          since: header.since,
          owner: header.owner,
          stable: header.stable,
          why: header.why
        },
        deps: header.deps ?? [],
        dependents: []
      });
    }

    // 3. Second pass: calculate dependencies
    this.calculateDependencies(feed, projectRoot);

    // 4. Sort by gravity descending
    return feed.sort((a, b) => b.gravity - a.gravity);
  }

  /**
   * Output AI feed file
   *
   * @param feed - AI feed list
   * @param outputPath - Output file path
   */
  writeFeedFile(feed: AIFeed[], outputPath: string): void {
    const lines: string[] = [
      '# CODEMAP AI FEED',
      `# Generated: ${new Date().toISOString()}`,
      ''
    ];

    for (const f of feed) {
      const lastDateStr = f.heat.lastDate ?? 'never';

      lines.push(`FILE: ${f.file}`);
      lines.push(`GRAVITY: ${f.gravity} | HEAT: ${f.heat.freq30d}/${f.heat.lastType}/${lastDateStr}`);
      lines.push(`META: since=${f.meta.since ?? 'unknown'} stable=${f.meta.stable ?? 'unknown'} why=${f.meta.why ?? 'none'}`);
      lines.push(`IMPACT: ${f.dependents.length} files depend on this`);
      lines.push(`DEPS: ${f.deps.join(', ') || 'none'}`);
      lines.push('---');
      lines.push('');
    }

    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  }

  /**
   * Scan Git history for heat score
   *
   * @param filePath - File path (relative to projectRoot)
   * @param projectRoot - Project root directory
   * @returns HeatScore heat score
   */
  private async scanGitHistory(filePath: string, projectRoot: string): Promise<HeatScore> {
    return this.gitAnalyzer.analyzeFileHeat(filePath, projectRoot);
  }

  /**
   * Calculate dependencies
   * Scan import statements, build dependency graph
   *
   * @param feed - AI feed list
   * @param projectRoot - Project root directory
   */
  private calculateDependencies(feed: AIFeed[], projectRoot: string): void {
    const fileMap = new Map<string, AIFeed>();

    // Build file map
    for (const item of feed) {
      fileMap.set(item.file, item);
    }

    // Scan import statements for each file
    for (const item of feed) {
      const fullPath = path.join(projectRoot, item.file);

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Scan import statements, match relative path imports
        // Match: import ... from './path' or import ... from '../path'
        const importMatches = [...content.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)];

        for (const match of importMatches) {
          const importPath = match[1];
          if (!importPath) continue;

          // Resolve import path to path relative to src
          const resolvedPath = this.resolveImportPath(item.file, importPath);

          if (resolvedPath) {
            // Normalize path: convert .js to .ts, or add .ts if no extension
            let normalizedPath: string;
            if (resolvedPath.endsWith('.ts')) {
              normalizedPath = resolvedPath;
            } else if (resolvedPath.endsWith('.js')) {
              normalizedPath = resolvedPath.slice(0, -3) + '.ts';
            } else {
              normalizedPath = resolvedPath + '.ts';
            }

            if (!item.deps.includes(normalizedPath)) {
              item.deps.push(normalizedPath);
            }

            // Check if target file exists in feed and add to dependents
            const possiblePaths = [
              resolvedPath,
              resolvedPath.endsWith('.js') ? resolvedPath.slice(0, -3) + '.ts' : resolvedPath + '.ts',
              resolvedPath + '/index.ts'
            ];

            for (const possiblePath of possiblePaths) {
              if (fileMap.has(possiblePath)) {
                // Add to target file's dependents
                const target = fileMap.get(possiblePath);
                if (target && !target.dependents.includes(item.file)) {
                  target.dependents.push(item.file);
                }
                break;
              }
            }
          }
        }
      } catch {
        // Skip on read failure
      }
    }

    // Recalculate gravity (out-degree + in-degree)
    for (const item of feed) {
      item.gravity = item.deps.length + item.dependents.length;
    }
  }

  /**
   * Resolve import path to path relative to project root
   *
   * @param currentFile - Current file path
   * @param importPath - Import path from import statement
   * @returns Resolved path, or null if cannot resolve
   */
  private resolveImportPath(currentFile: string, importPath: string): string | null {
    // Get current file's directory
    const currentDir = path.dirname(currentFile);

    // Resolve relative path
    const resolved = path.normalize(path.join(currentDir, importPath));

    // Ensure path is under src directory
    if (!resolved.startsWith('src/')) {
      return null;
    }

    return resolved;
  }

  /**
   * Scan file header (convenience method)
   * Delegates to FileHeaderScanner
   *
   * @param filePath - File path
   * @returns FileMeta file metadata
   */
  scanFileHeader(filePath: string): FileMeta {
    return this.headerScanner.scan(filePath);
  }

  /**
   * Calculate scores for a single feed item
   * Returns normalized scores
   *
   * @param feed - AI feed item
   * @param maxGravity - Maximum gravity value for normalization
   * @param maxImpact - Maximum impact value for normalization
   * @returns Object with gravity, impact, heat scores
   */
  calculateScores(
    feed: AIFeed,
    maxGravity: number = 20,
    maxImpact: number = 50
  ): { gravity: number; impact: number; heat: number } {
    const gravity = feed.deps.length + feed.dependents.length;
    const impact = feed.dependents.length;
    const heat = feed.heat.freq30d;

    return {
      gravity: Math.min(gravity / (maxGravity || 1), 1),
      impact: Math.min(impact / (maxImpact || 1), 1),
      heat: Math.min(heat / 10, 1)
    };
  }

  /**
   * Calculate file risk level
   * Based on REQUIREMENTS section 8.6 risk scoring formula
   *
   * @param feed - Single file AI feed
   * @returns Risk level: 'high' | 'medium' | 'low'
   */
  calculateRisk(feed: AIFeed): 'high' | 'medium' | 'low' {
    const gravity = feed.gravity;
    const heat = feed.heat;
    const impact = feed.dependents.length;
    const stable = feed.meta.stable ?? true;

    return this.gitAnalyzer.calculateRiskLevel(gravity, heat, impact, stable);
  }

  /**
   * Batch calculate risk levels
   *
   * @param feedList - AI feed list
   * @returns Map<file path, risk level>
   */
  calculateRisks(feedList: AIFeed[]): Map<string, 'high' | 'medium' | 'low'> {
    const result = new Map<string, 'high' | 'medium' | 'low'>();

    for (const feed of feedList) {
      result.set(feed.file, this.calculateRisk(feed));
    }

    return result;
  }

  /**
   * Get high risk file list
   *
   * @param feedList - AI feed list
   * @returns High risk file list
   */
  getHighRiskFiles(feedList: AIFeed[]): AIFeed[] {
    return feedList.filter(f => this.calculateRisk(f) === 'high');
  }

  /**
   * Generate JSON format AI feed
   * For programmatic processing
   *
   * @param feed - AI feed list
   * @param outputPath - Output file path
   */
  writeFeedFileJson(feed: AIFeed[], outputPath: string): void {
    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(feed, null, 2), 'utf-8');
  }
}

// Re-export types
export type { HeatScore };
