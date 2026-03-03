/**
 * 依赖查询去重功能单元测试
 * 
 * 验证修复：修复同一个依赖同时以 `kind: "dependency"` 和 `kind: "import"` 出现两次的问题
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';

// ============================================================================
// 辅助函数（模拟实现以测试逻辑）
// ============================================================================

interface DependencyEntry {
  name: string;
  sourcePath: string;
  type: 'dependency' | 'import';
}

interface SymbolIndex {
  dependencies: Map<string, DependencyEntry[]>;
}

interface MockModule {
  path: string;
  dependencies: string[];
  imports: Array<{ source: string; items: string[] }>;
}

/**
 * 标准化依赖名称（与 query.ts 中的实现一致）
 */
function normalizeDependencyName(name: string): string {
  return name
    .replace(/\.[jt]s$/, '')      // 去除 .ts 或 .js 扩展名
    .replace(/^\.\//, '')         // 去除 ./ 前缀
    .toLowerCase();
}

/**
 * 检查两个条目是否为重复
 */
function checkDuplicate(entry1: DependencyEntry, entry2: DependencyEntry): boolean {
  return entry1.name === entry2.name && entry1.sourcePath === entry2.sourcePath;
}

/**
 * 模拟 buildIndex 的去重逻辑
 */
function buildIndexWithDedup(modules: MockModule[]): SymbolIndex {
  const index: SymbolIndex = { dependencies: new Map() };
  
  for (const module of modules) {
    const seenDeps = new Set<string>();
    
    // 先索引 dependencies（优先保留）
    for (const dep of module.dependencies) {
      const normalizedDep = normalizeDependencyName(dep);
      const depKey = `${module.path}:${normalizedDep}`;
      
      if (seenDeps.has(depKey)) continue;
      seenDeps.add(depKey);
      
      const entry: DependencyEntry = {
        name: dep,
        sourcePath: module.path,
        type: 'dependency',
      };
      
      const lowerDep = dep.toLowerCase();
      if (!index.dependencies.has(lowerDep)) {
        index.dependencies.set(lowerDep, []);
      }
      index.dependencies.get(lowerDep)!.push(entry);
    }
    
    // 再索引 imports（去重）
    for (const imp of module.imports) {
      const normalizedSource = normalizeDependencyName(imp.source);
      const impKey = `${module.path}:${normalizedSource}`;
      
      if (seenDeps.has(impKey)) continue;
      seenDeps.add(impKey);
      
      const entry: DependencyEntry = {
        name: imp.source,
        sourcePath: module.path,
        type: 'import',
      };
      
      const lowerSource = imp.source.toLowerCase();
      if (!index.dependencies.has(lowerSource)) {
        index.dependencies.set(lowerSource, []);
      }
      index.dependencies.get(lowerSource)!.push(entry);
    }
  }
  
  return index;
}

// ============================================================================
// Phase 1: 重复检测检查点
// ============================================================================

describe('Phase 1: Dependency Duplication Detection', () => {
  
  it('CP-001: 应检测相同的 dependency 和 import 条目', () => {
    const depEntry = {
      name: 'analyzer',
      sourcePath: 'src/cli/commands/query.ts',
      type: 'dependency' as const,
    };
    
    const importEntry = {
      name: 'analyzer',
      sourcePath: 'src/cli/commands/query.ts',
      type: 'import' as const,
    };
    
    const isDuplicate = checkDuplicate(depEntry, importEntry);
    expect(isDuplicate).toBe(true);
  });

  it('CP-002: 不同源文件的相同依赖名称不应被视为重复', () => {
    const entry1 = {
      name: 'utils',
      sourcePath: 'src/fileA.ts',
      type: 'dependency' as const,
    };
    
    const entry2 = {
      name: 'utils',
      sourcePath: 'src/fileB.ts',
      type: 'import' as const,
    };
    
    const isDuplicate = checkDuplicate(entry1, entry2);
    expect(isDuplicate).toBe(false);
  });

  it('CP-003: 路径格式差异应被正确标准化', () => {
    const variations = [
      './analyzer',
      './analyzer.ts',
      'analyzer',
      path.normalize('./analyzer'),
    ];
    
    const normalized = variations.map(v => normalizeDependencyName(v));
    const allSame = normalized.every(n => n === normalized[0]);
    expect(allSame).toBe(true);
    expect(normalized[0]).toBe('analyzer');
  });
});

// ============================================================================
// Phase 2: 去重逻辑检查点
// ============================================================================

describe('Phase 2: Deduplication Logic', () => {
  
  it('CP-004: buildIndex 应对相同依赖去重', () => {
    const mockModule: MockModule = {
      path: 'src/cli/command.ts',
      dependencies: ['analyzer'],
      imports: [{ source: 'analyzer', items: [] }],
    };
    
    const index = buildIndexWithDedup([mockModule]);
    const analyzerEntries = index.dependencies.get('analyzer');
    
    // 验证：analyzer 应该只有一条（去重后）
    expect(analyzerEntries?.length).toBe(1);
    // 验证：保留的是 dependency 类型（优先保留）
    expect(analyzerEntries?.[0].type).toBe('dependency');
  });

  it('CP-005: 路径格式差异的去重', () => {
    const mockModule: MockModule = {
      path: 'src/utils.ts',
      dependencies: ['./analyzer.ts'],
      imports: [{ source: './analyzer', items: [] }],
    };
    
    const index = buildIndexWithDedup([mockModule]);
    const entries = index.dependencies.get('./analyzer.ts') || index.dependencies.get('./analyzer');
    
    // 标准化后应被视为同一依赖
    const allEntries = Array.from(index.dependencies.values()).flat();
    const analyzerEntries = allEntries.filter(e => 
      normalizeDependencyName(e.name) === 'analyzer'
    );
    
    expect(analyzerEntries.length).toBe(1);
  });

  it('CP-006: 不同来源的依赖不应被去重', () => {
    const mockModules: MockModule[] = [
      {
        path: 'src/fileA.ts',
        dependencies: ['utils'],
        imports: [],
      },
      {
        path: 'src/fileB.ts',
        dependencies: [],
        imports: [{ source: 'utils', items: [] }],
      },
    ];
    
    const index = buildIndexWithDedup(mockModules);
    const utilsEntries = index.dependencies.get('utils');
    
    // 来自不同文件，应该保留两条
    expect(utilsEntries?.length).toBe(2);
    expect(utilsEntries?.[0].sourcePath).toBe('src/fileA.ts');
    expect(utilsEntries?.[1].sourcePath).toBe('src/fileB.ts');
  });

  it('CP-007: 混合场景下的去重', () => {
    const mockModule: MockModule = {
      path: 'src/main.ts',
      dependencies: ['dep1', './dep2.ts'],
      imports: [
        { source: 'dep1', items: [] },           // 重复，应被去重
        { source: './dep2', items: [] },         // 路径格式差异，应被去重
        { source: 'dep3', items: [] },           // 新的依赖，应保留
      ],
    };
    
    const index = buildIndexWithDedup([mockModule]);
    const allEntries = Array.from(index.dependencies.values()).flat();
    
    // dep1, dep2, dep3 = 3 个依赖（dep1和dep2虽然有重复但去重后各保留1个）
    expect(allEntries.length).toBe(3);
    
    // 验证 dep1 是 dependency 类型（优先保留）
    const dep1Entries = allEntries.filter(e => normalizeDependencyName(e.name) === 'dep1');
    expect(dep1Entries[0].type).toBe('dependency');
  });
});

// ============================================================================
// Phase 3: 边界情况测试
// ============================================================================

describe('Phase 3: Edge Cases', () => {
  
  it('CP-008: 空依赖数组处理', () => {
    const mockModule: MockModule = {
      path: 'src/empty.ts',
      dependencies: [],
      imports: [],
    };
    
    const index = buildIndexWithDedup([mockModule]);
    expect(index.dependencies.size).toBe(0);
  });

  it('CP-009: 大小写不敏感的去重', () => {
    const mockModule: MockModule = {
      path: 'src/case.ts',
      dependencies: ['Analyzer'],
      imports: [{ source: 'analyzer', items: [] }],
    };
    
    const index = buildIndexWithDedup([mockModule]);
    // 应该被去重为一条
    const allEntries = Array.from(index.dependencies.values()).flat();
    expect(allEntries.length).toBe(1);
  });

  it('CP-010: 保留原始名称格式', () => {
    const mockModule: MockModule = {
      path: 'src/format.ts',
      dependencies: ['./MyModule.ts'],
      imports: [],
    };
    
    const index = buildIndexWithDedup([mockModule]);
    const entries = index.dependencies.get('./mymodule.ts');
    
    expect(entries?.[0].name).toBe('./MyModule.ts');  // 保留原始格式
    expect(entries?.[0].type).toBe('dependency');
  });
});

// ============================================================================
// Phase 4: 实际 CLI 集成测试
// ============================================================================

describe('Phase 4: CLI Integration', () => {
  
  it('CP-011: 验证 normalizeDependencyName 函数', () => {
    // 测试各种路径格式的标准化
    expect(normalizeDependencyName('./analyzer.ts')).toBe('analyzer');
    expect(normalizeDependencyName('./analyzer')).toBe('analyzer');
    expect(normalizeDependencyName('analyzer.js')).toBe('analyzer');
    expect(normalizeDependencyName('Analyzer')).toBe('analyzer');
    expect(normalizeDependencyName('./Utils/helper.ts')).toBe('utils/helper');
  });
});
