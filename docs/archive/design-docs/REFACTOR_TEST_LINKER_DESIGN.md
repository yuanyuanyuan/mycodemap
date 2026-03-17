# 测试关联器详细设计

> 归档时间：2026-03-15
> 归档原因：历史测试关联设计稿，已被当前测试规则和实现替代。
> 当前依据：`docs/rules/testing.md`、`src/orchestrator/test-linker.ts`
> 状态：仅供历史对照，不作为当前执行依据。


> 版本: 2.4
> 所属模块: 编排层 - 测试关联器

---

## 1. 功能定位

在影响分析场景中，根据源代码文件自动关联相关的测试文件。

---

## 2. 数据结构设计

### 2.1 测试配置

```typescript
// src/orchestrator/test-linker.ts

interface TestConfig {
  framework: 'jest' | 'vitest' | 'none';
  patterns: {
    testFile: string[];      // 测试文件匹配模式
    testDir: string[];       // 测试目录
  };
  sourceToTestMap: Map<string, string[]>;  // 源文件 → 测试文件映射
}
```

---

## 3. 接口设计

### 3.1 测试关联器类

```typescript
class TestLinker {
  private config: TestConfig | null = null;

  /**
   * 加载测试配置
   * 读取 jest.config.js / vitest.config.ts
   */
  async loadConfig(projectRoot: string): Promise<TestConfig> {
    const fsPromises = require('fs').promises;

    // 1. 尝试读取 vitest.config.ts
    const vitestPath = path.join(projectRoot, 'vitest.config.ts');
    if (await this.pathExists(vitestPath)) {
      return this.parseVitestConfig(vitestPath);
    }

    // 2. 尝试读取 jest.config.js
    const jestPath = path.join(projectRoot, 'jest.config.js');
    if (await this.pathExists(jestPath)) {
      return this.parseJestConfig(jestPath);
    }

    // 3. 使用默认模式
    const defaultConfig: TestConfig = {
      framework: 'vitest',
      patterns: {
        testFile: ['**/*.test.ts', '**/*.spec.ts'],
        testDir: ['__tests__', 'test', 'tests']
      },
      sourceToTestMap: new Map()
    };

    // 赋值到实例变量
    this.config = defaultConfig;
    return this.config;
  }

  /**
   * 检查文件是否存在
   * 使用 fsPromises.access 替代已废弃的 fs.exists
   */
  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await require('fs').promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 确保配置已加载
   * 在使用 this.config 前调用
   */
  private assertConfig(): void {
    if (!this.config) {
      throw new Error('TestLinker 配置未初始化，请先调用 loadConfig');
    }
  }
}
```

### 3.2 构建映射

```typescript
/**
 * 构建源文件 → 测试文件 映射
 * 基于测试框架的匹配规则
 */
async buildMapping(projectRoot: string, codemap: CodemapData): Promise<void> {
  // 确保配置已加载
  if (!this.config) {
    throw new Error('请先调用 loadConfig 加载测试配置');
  }

  const testFiles = await this.findTestFiles(projectRoot);

  for (const testFile of testFiles) {
    // 从测试文件名推断源文件
    // 例如: lru-cache.test.ts → lru-cache.ts
    const sourceFile = this.inferSourceFile(testFile);

    if (sourceFile) {
      const existing = this.config.sourceToTestMap.get(sourceFile) || [];
      existing.push(testFile);
      this.config.sourceToTestMap.set(sourceFile, existing);
    }

    // 扫描测试文件内容，找出 import 的源文件
    const imports = await this.scanTestImports(testFile);
    for (const imported of imports) {
      const existing = this.config.sourceToTestMap.get(imported) || [];
      if (!existing.includes(testFile)) {
        existing.push(testFile);
        this.config.sourceToTestMap.set(imported, existing);
      }
    }
  }
}
```

### 3.3 查找相关测试

```typescript
/**
 * 查找相关测试文件
 */
findRelatedTests(sourceFiles: string[]): string[] {
  // 确保配置已加载
  if (!this.config) {
    throw new Error('请先调用 loadConfig 加载测试配置');
  }

  const relatedTests = new Set<string>();

  for (const sourceFile of sourceFiles) {
    // 直接映射
    const direct = this.config.sourceToTestMap.get(sourceFile) || [];
    direct.forEach(t => relatedTests.add(t));

    // 目录级别匹配
    // src/cache/lru-cache.ts → src/cache/__tests__/
    const dirTests = this.findDirLevelTests(sourceFile);
    dirTests.forEach(t => relatedTests.add(t));
  }

  return Array.from(relatedTests);
}
```

### 3.4 源文件推断

```typescript
private inferSourceFile(testFile: string): string | null {
  // lru-cache.test.ts → lru-cache.ts
  // src/cache/__tests__/lru-cache.test.ts → src/cache/lru-cache.ts
  const normalized = testFile.replace(/\\/g, '/');
  const baseMatch = normalized.match(/^(.+?)\.(test|spec)\.ts$/);
  if (!baseMatch) return null;

  const base = baseMatch[1];
  // 处理任意层级的 __tests__ 目录
  if (base.includes('/__tests__/')) {
    return base.replace('/__tests__/', '/') + '.ts';
  }
  return base + '.ts';
}
```

---

## 4. 测试关联策略

| 策略 | 示例 | 优先级 |
|------|------|--------|
| **文件名匹配** | `lru-cache.ts` → `lru-cache.test.ts` | 高 |
| **目录匹配** | `src/cache/file.ts` → `src/cache/__tests__/*.test.ts` | 高 |
| **import 扫描** | 测试 import 了源文件 | 中 |
| **反向覆盖** | 哪些测试覆盖了目标代码 | 低（可选） |

---

## 5. 模块依赖

```
测试关联器 (test-linker.ts)
    │
    ├── 依赖: fs.promises (文件系统)
    │
    └── 被以下模块使用:
        └── AnalyzeCommand (analyze.ts)
        └── WorkflowOrchestrator (workflow-orchestrator.ts) (v2.5 新增)
```

---

## 7. 工作流阶段的测试关联 (v2.5 规划)

### 7.1 阶段特定的测试策略

```typescript
// 工作流阶段与测试关联的映射

const PHASE_TEST_STRATEGY: Record<WorkflowPhase, TestStrategy> = {
  reference: {
    // 参考搜索阶段：查找相关测试作为参考
    mode: 'find-similar',
    includePatterns: ['**/*.test.ts', '**/*.spec.ts'],
    excludePatterns: []
  },
  impact: {
    // 影响分析阶段：查找所有可能受影响的测试
    mode: 'find-affected',
    includePatterns: ['**/*.test.ts', '**/*.spec.ts'],
    excludePatterns: []
  },
  risk: {
    // 风险评估阶段：关注高风险模块的测试
    mode: 'focus-high-risk',
    includePatterns: ['**/*.test.ts'],
    excludePatterns: [],
    priority: 'high-risk-first'
  },
  implementation: {
    // 代码实现阶段：需要通过的测试
    mode: 'required-tests',
    includePatterns: ['**/*.test.ts', '**/*.spec.ts'],
    excludePatterns: []
  },
  commit: {
    // 提交阶段：验证测试通过
    mode: 'verify',
    includePatterns: ['**/*.test.ts', '**/*.spec.ts'],
    excludePatterns: []
  },
  ci: {
    // CI 阶段：完整测试套件
    mode: 'full-suite',
    includePatterns: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.js'],
    excludePatterns: []
  }
};
```

### 7.2 工作流测试建议生成

```typescript
class WorkflowTestLinker {
  /**
   * 根据当前工作流阶段生成测试建议
   */
  getTestSuggestions(
    phase: WorkflowPhase,
    sourceFiles: string[],
    context: WorkflowContext
  ): TestSuggestion[] {
    const strategy = PHASE_TEST_STRATEGY[phase];
    const testFiles = this.findRelatedTests(sourceFiles, strategy);

    return testFiles.map(testFile => ({
      file: testFile,
      relevance: this.calculateRelevance(testFile, sourceFiles),
      action: this.getSuggestedAction(phase, testFile),
      priority: this.getPriority(phase, testFile, context)
    }));
  }

  private getSuggestedAction(phase: WorkflowPhase, testFile: string): string {
    switch (phase) {
      case 'reference':
        return '参考此测试的实现模式';
      case 'impact':
        return '修改后需运行此测试';
      case 'risk':
        return '重点关注此测试，确保通过';
      case 'implementation':
        return '实现完成后运行此测试';
      case 'commit':
        return '提交前确保此测试通过';
      case 'ci':
        return 'CI 会自动运行此测试';
    }
  }
}
```

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 测试框架配置解析失败 | 无法关联测试 | 使用默认模式 |
| 复杂 import 关系 | 关联不准确 | 多种策略组合 |
