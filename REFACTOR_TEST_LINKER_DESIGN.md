# 测试关联器详细设计

> 版本: 2.3
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
  // lru-cache.spec.ts → lru-cache.ts
  // __tests__/lru-cache.test.ts → ../lru-cache.ts
  const patterns = [
    /^(.+?)\.(test|spec)\.ts$/,
    /^__tests__\/(.+?)\.(test|spec)\.ts$/
  ];

  for (const pattern of patterns) {
    const match = testFile.match(pattern);
    if (match) {
      return match[1] + '.ts';
    }
  }
  return null;
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
```

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 测试框架配置解析失败 | 无法关联测试 | 使用默认模式 |
| 复杂 import 关系 | 关联不准确 | 多种策略组合 |
