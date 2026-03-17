/**
 * [META] TestLinker - 测试文件关联器
 * [WHY] 基于 Jest/Vitest 配置自动关联测试文件
 */

import { readFile, access } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { glob, Glob } from 'glob';

/**
 * CodemapData - 代码映射数据结构
 * 用于 buildMapping 方法
 */
export interface CodemapData {
  /** 文件列表 */
  files?: string[];
  /** 源文件映射 */
  sourceFiles?: string[];
  [key: string]: unknown;
}

/**
 * 测试配置接口
 */
export interface TestConfig {
  /** 测试框架类型 */
  framework: 'jest' | 'vitest' | 'none';
  /** 匹配模式 */
  patterns: {
    /** 测试文件匹配模式 */
    testFile: string[];
    /** 测试目录 */
    testDir: string[];
  };
  /** 源文件 → 测试文件映射 */
  sourceToTestMap: Map<string, string[]>;
}

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
  private config: TestConfig | null = null;

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
   * 加载测试配置
   * 读取 jest.config.js / vitest.config.ts
   * @param projectRoot 项目根目录
   * @returns 测试配置对象
   */
  async loadConfig(projectRoot: string): Promise<TestConfig> {
    // 尝试读取 vitest.config.ts
    const vitestPath = join(projectRoot, 'vitest.config.ts');
    if (await this.pathExists(vitestPath)) {
      this.config = await this.parseVitestConfig(vitestPath);
      return this.config;
    }

    // 尝试读取 vitest.config.js
    const vitestJsPath = join(projectRoot, 'vitest.config.js');
    if (await this.pathExists(vitestJsPath)) {
      this.config = await this.parseVitestConfig(vitestJsPath);
      return this.config;
    }

    // 尝试读取 jest.config.js
    const jestPath = join(projectRoot, 'jest.config.js');
    if (await this.pathExists(jestPath)) {
      this.config = await this.parseJestConfig(jestPath);
      return this.config;
    }

    // 尝试读取 jest.config.ts
    const jestTsPath = join(projectRoot, 'jest.config.ts');
    if (await this.pathExists(jestTsPath)) {
      this.config = await this.parseJestConfig(jestTsPath);
      return this.config;
    }

    // 使用默认模式
    const defaultConfig: TestConfig = {
      framework: 'vitest',
      patterns: {
        testFile: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.js', '**/*.spec.js'],
        testDir: ['__tests__', 'test', 'tests']
      },
      sourceToTestMap: new Map()
    };

    this.config = defaultConfig;
    return this.config;
  }

  /**
   * 检查文件是否存在
   */
  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 解析 Vitest 配置
   */
  private async parseVitestConfig(configPath: string): Promise<TestConfig> {
    // 读取配置文件内容，提取 testMatch 或 testPattern
    const content = await readFile(configPath, 'utf-8');

    // 简单的模式提取
    const testMatchMatch = content.match(/testMatch\s*:\s*\[([^\]]+)\]/);
    const testPatternMatch = content.match(/testPattern\s*:\s*\[([^\]]+)\]/);

    const testFilePatterns: string[] = [];

    if (testMatchMatch) {
      // 提取字符串字面量
      const matches = testMatchMatch[1].match(/['"]([^'"]+)['"]/g);
      if (matches) {
        matches.forEach(m => {
          const pattern = m.replace(/['"]/g, '');
          testFilePatterns.push(pattern);
        });
      }
    }

    if (testPatternMatch) {
      const matches = testPatternMatch[1].match(/['"]([^'"]+)['"]/g);
      if (matches) {
        matches.forEach(m => {
          const pattern = m.replace(/['"]/g, '');
          if (!testFilePatterns.includes(pattern)) {
            testFilePatterns.push(pattern);
          }
        });
      }
    }

    // 如果没有从配置中提取到模式，使用默认值
    if (testFilePatterns.length === 0) {
      testFilePatterns.push('**/*.test.ts', '**/*.spec.ts');
    }

    return {
      framework: 'vitest',
      patterns: {
        testFile: testFilePatterns,
        testDir: ['__tests__', 'test', 'tests']
      },
      sourceToTestMap: new Map()
    };
  }

  /**
   * 解析 Jest 配置
   */
  private async parseJestConfig(configPath: string): Promise<TestConfig> {
    const content = await readFile(configPath, 'utf-8');

    // 提取 testMatch 或 testRegex
    const testMatchMatch = content.match(/testMatch\s*:\s*\[([^\]]+)\]/);
    const testRegexMatch = content.match(/testRegex\s*:\s*\[([^\]]+)\]/);

    const testFilePatterns: string[] = [];

    if (testMatchMatch) {
      const matches = testMatchMatch[1].match(/['"]([^'"]+)['"]/g);
      if (matches) {
        matches.forEach(m => {
          const pattern = m.replace(/['"]/g, '');
          testFilePatterns.push(pattern);
        });
      }
    }

    if (testRegexMatch) {
      const matches = testRegexMatch[1].match(/['"]([^'"]+)['"]/g);
      if (matches) {
        matches.forEach(m => {
          const pattern = m.replace(/['"]/g, '');
          if (!testFilePatterns.includes(pattern)) {
            testFilePatterns.push(pattern);
          }
        });
      }
    }

    if (testFilePatterns.length === 0) {
      testFilePatterns.push('**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts');
    }

    return {
      framework: 'jest',
      patterns: {
        testFile: testFilePatterns,
        testDir: ['__tests__', 'test', 'tests']
      },
      sourceToTestMap: new Map()
    };
  }

  /**
   * 确保配置已加载
   */
  private assertConfig(): void {
    if (!this.config) {
      throw new Error('TestLinker 配置未初始化，请先调用 loadConfig');
    }
  }

  /**
   * 构建源文件 → 测试文件 映射
   * 基于测试框架的匹配规则
   * @param projectRoot 项目根目录
   * @param codemap 代码映射数据
   */
  async buildMapping(projectRoot: string, codemap: CodemapData): Promise<void> {
    // 确保配置已加载
    if (!this.config) {
      await this.loadConfig(projectRoot);
    }

    this.assertConfig();

    const testFiles = await this.findTestFiles(projectRoot);

    // assertConfig 确保 this.config 不为 null
    const config = this.config!;

    for (const testFile of testFiles) {
      // 从测试文件名推断源文件
      // 例如: lru-cache.test.ts → lru-cache.ts
      const sourceFile = this.inferSourceFile(testFile);

      if (sourceFile) {
        const existing = config.sourceToTestMap.get(sourceFile) || [];
        if (!existing.includes(testFile)) {
          existing.push(testFile);
          config.sourceToTestMap.set(sourceFile, existing);
        }
      }

      // 扫描测试文件内容，找出 import 的源文件
      const imports = await this.scanTestImports(testFile);
      for (const imported of imports) {
        const existing = config.sourceToTestMap.get(imported) || [];
        if (!existing.includes(testFile)) {
          existing.push(testFile);
          config.sourceToTestMap.set(imported, existing);
        }
      }
    }
  }

  /**
   * 查找所有测试文件
   */
  private async findTestFiles(projectRoot: string): Promise<string[]> {
    if (!this.config) {
      return [];
    }

    const patterns = this.config.patterns.testFile;
    const allFiles: string[] = [];

    for (const pattern of patterns) {
      const glob = new Glob(pattern, {
        cwd: projectRoot,
        absolute: true,
      });

      const matches = await new Promise<string[]>((resolve, reject) => {
        const files: string[] = [];
        glob.on('match', (match) => {
          files.push(match);
        });
        glob.on('end', () => {
          resolve(files);
        });
        glob.on('error', reject);
      });

      allFiles.push(...matches);
    }

    // 去重
    return [...new Set(allFiles)];
  }

  /**
   * 从测试文件名推断源文件
   * lru-cache.test.ts → lru-cache.ts
   * src/cache/__tests__/lru-cache.test.ts → src/cache/lru-cache.ts
   */
  private inferSourceFile(testFile: string): string | null {
    const normalized = testFile.replace(/\\/g, '/');
    const baseMatch = normalized.match(/^(.+?)\.(test|spec)\.(ts|js|mjs|tsx|jsx)$/);
    if (!baseMatch) return null;

    const base = baseMatch[1];
    // 处理任意层级的 __tests__ 目录
    if (base.includes('/__tests__/')) {
      return base.replace(/\/__tests__\//, '/') + '.ts';
    }
    // 处理 test 目录
    if (base.includes('/test/')) {
      return base.replace(/\/test\//, '/src/') + '.ts';
    }
    // 处理 tests 目录
    if (base.includes('/tests/')) {
      return base.replace(/\/tests\//, '/src/') + '.ts';
    }
    return base + '.ts';
  }

  /**
   * 扫描测试文件的 import 语句
   * 提取被导入的源文件路径
   * @param testFile 测试文件路径
   * @returns 源文件路径列表
   */
  async scanTestImports(testFile: string): Promise<string[]> {
    try {
      const content = await readFile(testFile, 'utf-8');
      const importedFiles: string[] = [];

      // 匹配 ESM import 语句
      // import xxx from 'xxx' 或 import 'xxx'
      const importRegex = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        // 过滤掉 node_modules 导入
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
          continue;
        }
        // 转换为绝对路径
        const resolvedPath = importPath.startsWith('/')
          ? importPath
          : join(dirname(testFile), importPath);

        importedFiles.push(resolvedPath);
      }

      // 匹配 require() 语句
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
          continue;
        }
        const resolvedPath = importPath.startsWith('/')
          ? importPath
          : join(dirname(testFile), importPath);

        if (!importedFiles.includes(resolvedPath)) {
          importedFiles.push(resolvedPath);
        }
      }

      // 匹配动态 import 语句
      const dynamicImportRegex = /await\s+import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = dynamicImportRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
          continue;
        }
        const resolvedPath = importPath.startsWith('/')
          ? importPath
          : join(dirname(testFile), importPath);

        if (!importedFiles.includes(resolvedPath)) {
          importedFiles.push(resolvedPath);
        }
      }

      return importedFiles;
    } catch {
      return [];
    }
  }

  /**
   * 查找目录级别测试文件
   * 支持 src/cache/__tests__/*.test.ts 格式
   * 支持 src/cache/test/*.test.ts 格式
   * @param sourceFile 源文件路径
   * @returns 测试文件路径列表
   */
  async findDirLevelTests(sourceFile: string): Promise<string[]> {
    this.assertConfig();

    const sourceDir = dirname(sourceFile);
    const sourceBasename = this.getBasename(sourceFile);
    const testFiles: string[] = [];

    // 策略1: __tests__ 目录
    const testsDir1 = join(sourceDir, '__tests__');
    const patterns1 = [
      join(testsDir1, `${sourceBasename}.test.ts`),
      join(testsDir1, `${sourceBasename}.test.js`),
      join(testsDir1, `${sourceBasename}.spec.ts`),
      join(testsDir1, `${sourceBasename}.spec.js`),
    ];

    for (const pattern of patterns1) {
      if (await this.pathExists(pattern)) {
        testFiles.push(pattern);
      }
    }

    // 策略2: test 目录
    const testsDir2 = join(sourceDir, 'test');
    const patterns2 = [
      join(testsDir2, `${sourceBasename}.test.ts`),
      join(testsDir2, `${sourceBasename}.test.js`),
      join(testsDir2, `${sourceBasename}.spec.ts`),
      join(testsDir2, `${sourceBasename}.spec.js`),
    ];

    for (const pattern of patterns2) {
      if (await this.pathExists(pattern)) {
        if (!testFiles.includes(pattern)) {
          testFiles.push(pattern);
        }
      }
    }

    // 策略3: tests 目录
    const testsDir3 = join(sourceDir, 'tests');
    const patterns3 = [
      join(testsDir3, `${sourceBasename}.test.ts`),
      join(testsDir3, `${sourceBasename}.test.js`),
      join(testsDir3, `${sourceBasename}.spec.ts`),
      join(testsDir3, `${sourceBasename}.spec.js`),
    ];

    for (const pattern of patterns3) {
      if (await this.pathExists(pattern)) {
        if (!testFiles.includes(pattern)) {
          testFiles.push(pattern);
        }
      }
    }

    return testFiles;
  }

  /**
   * 查找相关测试文件
   * @param sourceFiles 源文件路径列表
   * @returns 相关测试文件路径列表
   */
  async findRelatedTests(sourceFiles: string[]): Promise<string[]> {
    this.assertConfig();

    const relatedTests = new Set<string>();

    for (const sourceFile of sourceFiles) {
      // 直接映射
      const direct = this.config!.sourceToTestMap.get(sourceFile) || [];
      direct.forEach(t => relatedTests.add(t));

      // 目录级别匹配
      const dirTests = await this.findDirLevelTests(sourceFile);
      dirTests.forEach(t => relatedTests.add(t));
    }

    return Array.from(relatedTests);
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
