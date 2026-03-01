/**
 * TestLinker - 测试文件关联器
 * 基于 Jest/Vitest 配置自动关联测试文件
 */

import { readFile, access } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import pkg from 'glob';
const { Glob } = pkg;

/**
 * 测试文件关联配置
 */
export interface TestLinkerOptions {
  /** 项目根目录 */
  rootDir?: string;
  /** 测试框架类型 */
  framework?: 'jest' | 'vitest' | 'auto';
}

/**
 * 测试文件映射结果
 */
export interface TestMapping {
  /** 源文件路径 */
  sourceFile: string;
  /** 关联的测试文件 */
  testFile: string | null;
  /** 测试框架 */
  framework: string;
}

/**
 * TestLinker 类
 */
export class TestLinker {
  private rootDir: string;
  private framework: 'jest' | 'vitest' | 'auto';
  private testPatterns: string[] = [];

  constructor(options: TestLinkerOptions = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.framework = options.framework || 'auto';
  }

  /**
   * 初始化测试链接器
   * 检测测试框架并加载配置
   */
  async initialize(): Promise<void> {
    if (this.framework !== 'auto') {
      this.testPatterns = this.getDefaultPatterns(this.framework);
      return;
    }

    // 自动检测测试框架
    const hasVitest = await this.hasConfig('vitest.config.ts') || await this.hasConfig('vitest.config.js');
    const hasJest = await this.hasConfig('jest.config.js') || await this.hasConfig('jest.config.ts');

    if (hasVitest) {
      this.framework = 'vitest';
      this.testPatterns = this.getDefaultPatterns('vitest');
    } else if (hasJest) {
      this.framework = 'jest';
      this.testPatterns = this.getDefaultPatterns('jest');
    } else {
      // 默认使用 Vitest 模式
      this.framework = 'vitest';
      this.testPatterns = this.getDefaultPatterns('vitest');
    }
  }

  /**
   * 检查配置文件是否存在
   */
  private async hasConfig(filename: string): Promise<boolean> {
    try {
      await access(join(this.rootDir, filename));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取默认测试模式
   */
  private getDefaultPatterns(framework: 'jest' | 'vitest'): string[] {
    if (framework === 'jest') {
      return [
        '**/*.test.ts',
        '**/*.test.js',
        '**/*.spec.ts',
        '**/*.spec.js',
        '**/__tests__/**/*.ts',
        '**/__tests__/**/*.js',
      ];
    }

    return [
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
    ];
  }

  /**
   * 解析源文件对应的测试文件
   * @param sourceFile 源文件路径
   * @returns 测试文件路径，如果不存在则返回 null
   */
  async resolveTestFile(sourceFile: string): Promise<string | null> {
    await this.initialize();

    const sourceDir = dirname(sourceFile);
    const sourceBasename = this.getBasename(sourceFile);

    // 尝试多种测试文件命名模式
    const testPatterns = [
      // 同目录同名测试文件
      join(sourceDir, `${sourceBasename}.test.ts`),
      join(sourceDir, `${sourceBasename}.test.js`),
      join(sourceDir, `${sourceBasename}.spec.ts`),
      join(sourceDir, `${sourceBasename}.spec.js`),
      // __tests__ 目录
      join(sourceDir, '__tests__', `${sourceBasename}.test.ts`),
      join(sourceDir, '__tests__', `${sourceBasename}.test.js`),
      // 同名文件在 test 目录
      join(sourceDir.replace('/src/', '/test/'), `${sourceBasename}.test.ts`),
      join(sourceDir.replace('/src/', '/tests/'), `${sourceBasename}.test.ts`),
    ];

    for (const pattern of testPatterns) {
      try {
        await access(pattern);
        return pattern;
      } catch {
        continue;
      }
    }

    // 使用 glob 搜索
    const globMatches = await this.globSearch(sourceFile);
    if (globMatches.length > 0) {
      return globMatches[0];
    }

    return null;
  }

  /**
   * 获取文件名（不含扩展名）
   */
  private getBasename(filePath: string): string {
    const base = filePath.split(/[/\\]/).pop() || '';
    return base.replace(/\.(ts|js|mjs|jsx|tsx)$/, '');
  }

  /**
   * 使用 glob 搜索测试文件
   */
  private async globSearch(sourceFile: string): Promise<string[]> {
    const sourceDir = dirname(sourceFile);
    const sourceBasename = this.getBasename(sourceFile);

    const glob = new Glob(`**/${sourceBasename}.{test,spec}.{ts,js}`, {
      cwd: this.rootDir,
      absolute: true,
    });

    const matches = await new Promise<string[]>((resolve, reject) => {
      glob.on('match', (match) => {
        // 收集匹配结果
      });
      glob.on('end', (matches) => {
        resolve(matches.slice(0, 3));
      });
      glob.on('error', reject);
    });

    return matches;
  }

  /**
   * 批量解析多个源文件的测试文件
   */
  async resolveTestFiles(sourceFiles: string[]): Promise<TestMapping[]> {
    const mappings: TestMapping[] = [];

    for (const sourceFile of sourceFiles) {
      const testFile = await this.resolveTestFile(sourceFile);
      mappings.push({
        sourceFile,
        testFile,
        framework: this.framework,
      });
    }

    return mappings;
  }

  /**
   * 获取所有测试文件
   */
  async getAllTestFiles(): Promise<string[]> {
    const glob = new Glob(this.testPatterns[0], {
      cwd: this.rootDir,
      absolute: true,
    });

    return new Promise<string[]>((resolve, reject) => {
      const matches: string[] = [];
      glob.on('match', (match) => {
        matches.push(match);
      });
      glob.on('end', () => {
        resolve(matches);
      });
      glob.on('error', reject);
    });
  }
}

/**
 * 解析测试文件的便捷函数
 */
export async function resolveTestFile(sourceFile: string): Promise<string | null> {
  const linker = new TestLinker();
  return linker.resolveTestFile(sourceFile);
}

/**
 * 批量解析测试文件的便捷函数
 */
export async function resolveTestFiles(sourceFiles: string[]): Promise<TestMapping[]> {
  const linker = new TestLinker();
  return linker.resolveTestFiles(sourceFiles);
}
